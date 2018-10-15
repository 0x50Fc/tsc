#ifndef _Demo_H
#define _Demo_H

#include <kk/kk.h>

namespace kk {

	typedef kk::Map<kk::Number,kk::String> PropertyMap;
	class IDemo:public kk::IObject {
	public:
		virtual kk::String title() = 0;
		virtual kk::Number version() = 0;
		virtual kk::Boolean output() = 0;
		virtual void setOutput(kk::Boolean v) = 0;
		virtual PropertyMap * propertys() = 0;
		virtual void setPropertys(PropertyMap * v) = 0;
		virtual kk::Function * ondone() = 0;
		virtual void setOndone(kk::Function * v) = 0;
		virtual kk::String exec(kk::String name) = 0;
	};

	class Demo:public kk::Object,public IDemo {
	private: 
		kk::String _title;

	private: 
		kk::Number _version;

	public: 
		virtual PropertyMap * propertys();
		virtual void setPropertys(PropertyMap * v);
	protected:
		kk::Strong _propertys;

	public: 
		virtual kk::String title();

	public: 
		virtual kk::Number version();

	public: 
		virtual kk::Boolean output();
		virtual void setOutput(kk::Boolean v);
	protected:
		kk::Boolean _output;

	public: 
		virtual kk::Function * ondone();
		virtual void setOndone(kk::Function * v);
	protected:
		kk::Strong _ondone;

	public: 
		virtual kk::String exec(kk::String name);
	public: 
		virtual kk::String done(kk::String name);
	public:
		Demo(kk::String title,kk::Number version);

	};

	IDemo * createDemo(kk::String title,kk::Number version);
}

#endif

