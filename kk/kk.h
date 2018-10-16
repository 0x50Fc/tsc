#ifndef _KK_H
#define _KK_H

#include <string>
#include <map>

namespace kk {

    typedef int Int;
    typedef int Int32;
    typedef long long Int64;
    typedef unsigned int Uint;
    typedef unsigned int Uint32;
    typedef unsigned long long Uint64;
    typedef double Number;
    typedef bool Boolean;
    typedef void * IMP;
    class Closure;
    class IObject;

    class String : public std::string {
    public:
        String(){};
        String(const char * v);
        String(const String& v);
        String& operator=(const char * v);
        String& operator=(Boolean v);
        String& operator=(Number v);
        String& operator=(IObject * v);
    };

    class IObject {
    public:
    };

    class Object : public IObject {
    public:
        virtual operator kk::IMP();
    };

    class _Function : public Object {
    public:
        _Function();
        _Function(IMP func);
        virtual IMP func();
    protected:
        IMP _func;
        Closure * _closure;
    };

    template<typename T,typename ... TArg>
    class Function : public _Function {
    public:
        Function():_Function(){}
        Function(T (*func(Closure *,TArg ...))):_Function((IMP)func){}
        Function(const Function & v) { _func = (IMP) v._func;}
        virtual T operator()(TArg ... arg) { 
            T ((*fn)(Closure *,TArg...)) = (T (*)(Closure *,TArg...))_func;
            if(fn != nullptr) {
                return (*fn)(_closure,arg...);
            }
            return (T) nullptr; 
        }
        virtual Function & operator=(void * v) {
            return * this;
        }
    };

    template<typename TKey,typename TValue>
    class Map : public Object {
    public:
        Map(){}
        Map(const Map & v) {
            _objects = v->_objects;
        }
        TValue & operator [] (TKey key) {
            return _objects[key];
        }
        Map& operator=(const Map & v){
            _objects = v->_objects;
            return * this;
        }
    protected:
        std::map<TKey,TValue> _objects;
    };

    class Closure : public Object {
    public:
        virtual Closure * parent();
        virtual void addObject(IObject * object);
    };

    void Retain(IObject * object);

    void Release(IObject * object);

    template<class T>
    class Strong {
    public:
        Strong():_object(nullptr) {

        }
        
        Strong(T object):_object(nullptr) {
            set(object);
        }

        Strong(const Strong &ref) {
            set(ref._object);
        }

        virtual ~Strong() {
            if(_object != nullptr) {
                Release((IObject *)_object);
            }
        }

        virtual T as() {
            return _object;
        }

        virtual void set(T object) {
            if(object != nullptr) {
                Retain((IObject *)object);
            }
            if(_object != nullptr) {
                Release((IObject *)_object);
            }
            _object = object;
        }

        virtual Strong& operator=(T object) {
            set(object);
            return * this;
        }

        virtual Strong& operator=(Strong& ref) {
            set(ref._object);
            return * this;
        }

        virtual operator T() {
            return _object;
        }

    protected:
        T _object;
    };


    enum Type {
        TypeNil,
        TypeString,
        TypeNumber,
        TypeBoolean,
        TypeFunction,
        TypeObject
    };

    class Any {
    public:
        Any();
        Any(const Any & v);
        virtual String & stringValue();
        virtual Object * objectValue();
        template<typename T>
        T funcValue() {
            if(_type == TypeFunction) {
                return (T) _functionValue.func();
            }
            return nullptr;
        }
        virtual Number numberValue();
        virtual Boolean booleanValue();
        
        virtual bool operator!=(IObject * b);
        virtual bool operator==(IObject * b);
        virtual Any& operator=(kk::String& v);
        
        virtual operator kk::IMP();

    protected:
        Type _type;
        _Function _functionValue;
        Strong<IObject> _objectValue;
        String _stringValue;
        union {
            Number _numberValue;
            Boolean _booleanValue;
        };
    };

}

#endif

