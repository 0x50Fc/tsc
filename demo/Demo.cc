#include "Demo.h"

namespace kk {

	inline static kk::String __closure__func__1224_1305__(kk::_Closure * __Closure__,kk::String name) {
		kk::Int v = __Closure__->get("v");
		return name+"_"+v;
	}

	PropertyMap * Demo::propertys(){
		return _propertys;
	}

	void Demo::setPropertys(PropertyMap * __newValue__){
		this->_propertys = __newValue__ ;
	}

	kk::String Demo::title(){
		return this->_title;
	}

	kk::Int Demo::version(){
		return this->_version;
	}

	kk::Boolean Demo::output(){
		return _output;
	}

	void Demo::setOutput(kk::Boolean __newValue__){
		this->_output = __newValue__ ;
	}

	kk::Closure<kk::String,kk::String> * Demo::ondone(){
		return _ondone;
	}

	void Demo::setOndone(kk::Closure<kk::String,kk::String> * __newValue__){
		this->_ondone = __newValue__ ;
	}

	kk::String Demo::exec(kk::String name) {
		for(kk::Int i = 0,n = 10;i<n;i++) {
		}
		kk::Int v = (kk::Int)0;
		switch(v) {
		case 1 :
			break;
		default:
			break;
		}
		this->_ondone=(new kk::Closure<kk::String,kk::String>(__closure__func__1224_1305__))->as("v",kk::Any(v));
		return this->done(name);
	}

	kk::String Demo::done(kk::String name) {
		kk::Closure<kk::String,kk::String> * fn = (kk::Closure<kk::String,kk::String> *)this->_ondone;
		if(fn!=nullptr) {
			return (*(fn))(name);
		}
		return "";
	}

	Demo::Demo(kk::String title,kk::Int version) {
		this->_title="demo";
		this->_version=1.0;
		{
			PropertyMap * __V__ = new PropertyMap();
			this->_propertys = __V__;
		}
		this->_output=false;
		this->_ondone=nullptr;
		this->_title=title;
		this->_version=version;
	}

	kk::IDemo * createDemo(kk::String title,kk::Int version) {
		return new Demo(title,version);
	}

}

